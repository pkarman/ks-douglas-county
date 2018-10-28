#!/usr/bin/env perl
use strict;
use warnings;
use Text::CSV_XS;
use Data::Dump qw( dump );
use File::Path qw( make_path );

my $usage
    = "$0 in_dir out_dir voter_file.csv daily-early-voter.csv daily-adv-mail-sent.csv daily-adv-returned.csv";
my $in_dir             = shift or die $usage;
my $out_dir            = shift or die $usage;
my $voter_file         = shift or die $usage;
my $early_voter_file   = shift or die $usage;
my $adv_mail_sent_file = shift or die $usage;
my $adv_returned_file  = shift or die $usage;

sub trim {
    $_[0] =~ s/^\s+|\s+$//g;
}

sub parse_row {
    my $row   = shift;
    my $voter = {
        name => join(
            ' ',
            grep {length} (
                "$row->{text_name_last},", $row->{text_name_first},
                $row->{text_name_middle}
            )
        ),
        phone => join(
            '-',
            grep { length > 2 } (
                $row->{text_phone_area_code}, $row->{text_phone_exchange},
                $row->{text_phone_last_four}
            )
        ),
        precinct => $row->{precinct_part_text_name},
        party    => $row->{desc_party},
        id       => $row->{text_registrant_id},
        address  => join(
            ' ',
            grep {length} map { my $v = $_; trim($v); $v; } (
                $row->{text_res_address_nbr},
                $row->{text_res_address_nbr_suffix},
                $row->{text_res_carrier_rte},
                $row->{cde_street_dir_prefix},
                $row->{text_street_name},
                $row->{cde_street_dir_suffix},
                $row->{cde_street_type},
                (   $row->{text_res_unit_nbr}
                    ? "#$row->{text_res_unit_nbr}"
                    : ''
                ),
                $row->{text_res_city},
                $row->{text_res_zip5}
            )
        ),
    };
    return $voter;
}

sub parse_csv {
    my ($csv_file) = @_;

    my $voters = {};
    my $csv = Text::CSV_XS->new( { binary => 1, auto_diag => 1 } );
    open my $fh, "<", $csv_file or die "Can't open $csv_file: $!";
    $csv->header($fh);
    while ( my $row = $csv->getline_hr($fh) ) {

        #dump $row;
        my $voter = parse_row($row);

        #dump $voter;
        $voters->{ $voter->{id} } = $voter;
    }

    return $voters;
}

my %out_filehandles = ();
make_path($out_dir);

sub get_precinct_filehandle {
    my ($voter)  = @_;
    my $precinct = $voter->{precinct};
    my $filename = "$out_dir/$precinct-not-voted.csv";
    if ( $out_filehandles{$filename} ) {
        return $out_filehandles{$filename};
    }

    open my $fh, ">:encoding(utf8)", $filename
        or die "Can't open $filename: $!";

    $out_filehandles{$filename} = $fh;

    return $fh;
}

my $registered_voters       = parse_csv("$in_dir/$voter_file");
my $early_in_person_voters  = parse_csv("$in_dir/$early_voter_file");
my $sent_adv_ballot         = parse_csv("$in_dir/$adv_mail_sent_file");
my $early_adv_ballot_voters = parse_csv("$in_dir/$adv_returned_file");

# - data will need to be organized by precinct;
#	- each precinct list will have data in three columns,
#   each column to have the voter name and phone number and
#   alphabetized by voter last name
#	- each page will have a header with the precinct number/polling place and a page number.

my $csv = Text::CSV_XS->new( { binary => 1, auto_diag => 1, eol => "\n" } );
for my $voter_id ( keys %$registered_voters ) {
    my $voter = $registered_voters->{$voter_id};
    next if $voter->{party} eq 'Republican';
    my $voted_in_person = exists $early_in_person_voters->{$voter_id};
    my $voted_via_advb  = exists $early_adv_ballot_voters->{$voter_id};
    my $sent_adv_ballot = exists $sent_adv_ballot->{$voter_id};

    next if $voted_in_person;
    next if $voted_via_advb;

    # if we get here the person has not yet voted
    #dump $voter;

    my $fh = get_precinct_filehandle($voter);
    my $column = sprintf( "%s - %s", $voter->{name}, $voter->{phone} );
    $csv->print( $fh, [ $column, $column, $column ] ) or $csv->error_diag;
}
