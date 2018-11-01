#!/usr/bin/env perl
use strict;
use warnings;
use Text::CSV_XS;
use Data::Dump qw( dump );
use File::Path qw( make_path );

my $usage = "$0 voter_file.csv";
my $voter_file = shift or die $usage;

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

my $registered_voters = parse_csv($voter_file);

my $parties = {};
my $total   = 0;

for my $id ( keys %$registered_voters ) {
    $parties->{ $registered_voters->{$id}->{party} }++;
    $total++;
}

for my $party ( keys %$parties ) {
    my $reg = $parties->{$party};
    $parties->{$party} = { reg => $reg, perc => ( $reg / $total ) * 100 };
}

print "Total voters: $total\n";
dump $parties;
